"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, Trophy, Tv, Users, type LucideIcon } from "lucide-react";
import { HeroTv } from "@/components/HeroTv";
import { LiveRvPanel } from "@/components/LiveRvPanel";
import { OpenLobbyPanel } from "@/components/OpenLobbyPanel";
import { SiteHeader } from "@/components/SiteHeader";
import { SocialsRow } from "@/components/SocialsRow";
import { ModeBadge } from "@/components/ModeBadge";
// NOTE: the card libraries (ALL_BUFFS / ALL_NERFS) are NOT imported statically.
// They transitively pull the entire card engine (~12k lines) into the home
// page's client bundle just to show a handful of card faces and counts, a
// large parse + execute cost on the landing page for low-end devices.
// FeaturedCards and HeroRatings lazy-import them so the engine never ships in
// this chunk.
import { TIER_ROMAN } from "@/lib/tiers";
import { useLobbySnapshot } from "@/lib/lobbyClient";
import { AccountUser, fetchMe } from "@/lib/authClient";
import { ActiveGame, loadActiveGame, clearActiveGame } from "@/lib/multiplayer";
import { NewHereChip } from "@/components/NewHereChip";
import { Button } from "@/components/ui/Button";
import { LinkButton } from "@/components/ui/Button";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />

      {/* Hero: the live featured board on the left, a compact action column
          on the right. Three stacked ways in, then the live counts. On mobile
          the board leads and the lobby entry follows directly under it. */}
      <section className="w-full max-w-7xl mx-auto px-5 sm:px-6 pt-3 pb-8 sm:pt-6 grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 lg:gap-8 items-start">
        <div className="order-1">
          <HeroTv />
          {/* Mobile stack: board, then the LOBBY entry directly below it, then
              the live-games panel. Desktop keeps its action column beside the
              board, so both panels hide at lg. */}
          <OpenLobbyPanel className="mt-2.5 lg:hidden" />
          <LiveRvPanel className="mt-3 lg:hidden" />
        </div>

        {/* The action column: one box, three buttons, the counts underneath. */}
        <div className="order-2">
          <div className="flex items-start justify-between gap-3">
            {/* The page's H1. The sr-only tail gives search engines the "chess
                with power-ups" target phrase without changing the visible hero. */}
            <h1 className="font-display text-[15px] font-bold text-parchment-50">
              Nerf Chess
              <span className="sr-only">: chess with power-ups, a free online chess variant</span>
            </h1>
            <div className="flex flex-col items-end gap-2">
              <NewHereChip />
              <HeroRatings />
            </div>
          </div>

          {/* The one-breath pitch: what the two words on the tin actually
              change. Concrete, not marketing air. */}
          <p className="mt-2 text-[14px] leading-snug text-parchment-300">
            Every five moves you draft a card. In{" "}
            <span className="font-semibold text-mode-buffGlow">Buff</span> mode you stack powers
            onto your own army; in <span className="font-semibold text-mode-nerfGlow">Nerf</span>{" "}
            mode you start with a secret handicap and curse your opponent. Capture the king to win.
          </p>

          {/* Three stacked ways in. Create a game is the one primary: it opens
              the lobby's quick pairing, where Buff and 3+2 are preselected. */}
          <div className="mt-4 flex flex-col gap-2">
            <LinkButton tone="primary" href="/lobby" block size="lg">
              Create a game
            </LinkButton>
            <LinkButton tone="default" href="/play" block size="lg">
              Play with the computer
            </LinkButton>
            <LinkButton tone="default" href="/lobby?tab=friends" block size="lg">
              Play with a friend
            </LinkButton>
          </div>

          <LiveNowStrip />
          <ReturnToGameBanner />

          {/* Two compact mode doors. One clause each; ?mode= wins over the
              remembered choice, and the full explanation lives in How it works
              below. */}
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Link
              href="/lobby?mode=buff"
              className="plate plate-hover group flex items-center justify-between gap-3 p-3 no-underline"
            >
              <span className="min-w-0">
                <span className="font-display text-[14px] font-bold text-mode-buffGlow">Buff mode</span>
                <span className="block truncate text-[12px] leading-snug text-parchment-300">
                  Stack powers onto your own army.
                </span>
              </span>
              <span className="shrink-0 text-[12px] font-medium text-mode-buffGlow/80 transition-colors group-hover:text-mode-buffGlow">
                Play
              </span>
            </Link>
            <Link
              href="/lobby?mode=nerf"
              className="plate plate-hover group flex items-center justify-between gap-3 p-3 no-underline"
            >
              <span className="min-w-0">
                <span className="font-display text-[14px] font-bold text-mode-nerfGlow">Nerf mode</span>
                <span className="block truncate text-[12px] leading-snug text-parchment-300">
                  Secret handicaps, hexes, and boons.
                </span>
              </span>
              <span className="shrink-0 text-[12px] font-medium text-mode-nerfGlow/80 transition-colors group-hover:text-mode-nerfGlow">
                Play
              </span>
            </Link>
          </div>
        </div>
      </section>

      <HowItWorks />
      <FeaturedCards />
      <LiveActivity />
      <CommunityProof />

      {/* Socials close out the page as a full follow block: playtesters kept
          missing the old quiet chip row entirely. */}
      <div className="max-w-7xl mx-auto w-full px-6 pt-6 pb-2">
        <SocialsRow variant="prominent" />
      </div>
      <SiteFooter />
    </main>
  );
}

// The live pulse right under the play actions: how many people are here and how
// many games are running, on one readable line, so a new visitor sees at once
// that there is someone to play. Rendered only once the first lobby snapshot
// resolves; never faked while it is loading, never a fabricated number.
function LiveNowStrip() {
  const lobby = useLobbySnapshot(10000);
  if (!lobby) return null;
  const online = lobby.players.length + lobby.anonymous;
  const games = lobby.games.length;
  return (
    <Link
      href="/lobby"
      className="mt-3 flex items-center gap-2 text-[13px] text-parchment-300 no-underline transition-colors hover:text-parchment-100"
    >
      <span className="dot-live h-2 w-2 shrink-0 bg-verdigris" />
      <span>
        <span className="font-display font-bold tabular-nums text-parchment-50">{online}</span>{" "}
        online
        <span className="mx-1.5 text-parchment-500">·</span>
        <span className="font-display font-bold tabular-nums text-parchment-50">{games}</span>{" "}
        {games === 1 ? "game" : "games"} live
      </span>
    </Link>
  );
}

// A signed-in player who already has mode ratings sees a compact chip row next
// to the CTA. Guests get nothing here (no empty placeholder bar). The data is
// the same fetchMe + per-user ratings the profile uses; the card engine is
// never touched, so this stays off the landing-page critical path.
function HeroRatings() {
  const [user, setUser] = useState<AccountUser | null | undefined>(undefined);
  const [ratings, setRatings] = useState<Partial<Record<"nerf" | "buff", number>>>({});

  useEffect(() => {
    let cancelled = false;
    fetchMe().then((me) => {
      if (cancelled) return;
      setUser(me);
      if (!me || me.isGuest) return;
      fetch(`/api/users/${encodeURIComponent(me.username)}`)
        .then((res) => (res.ok ? res.json() : null) as Promise<{ ratings?: Record<string, { rating: number }> } | null>)
        .then((data) => {
          if (cancelled || !data?.ratings) return;
          setRatings({
            nerf: data.ratings.nerf ? Math.round(data.ratings.nerf.rating) : undefined,
            buff: data.ratings.buff ? Math.round(data.ratings.buff.rating) : undefined,
          });
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user || user.isGuest) return null;
  const chips: { key: "nerf" | "buff"; label: string; value: number; tone: string; edge: string }[] = [];
  if (ratings.nerf != null) chips.push({ key: "nerf", label: "Nerf", value: ratings.nerf, tone: "text-mode-nerfGlow", edge: "border-mode-nerf/40 bg-mode-nerf/10" });
  if (ratings.buff != null) chips.push({ key: "buff", label: "Buff", value: ratings.buff, tone: "text-mode-buffGlow", edge: "border-mode-buff/40 bg-mode-buff/10" });
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {chips.map((c) => (
        <Link
          key={c.key}
          href={`/u/${encodeURIComponent(user.username)}`}
          title="Your profile"
          className={`flex items-center gap-1.5 border px-2.5 py-1 text-[13px] no-underline ${c.edge}`}
        >
          <span className={c.tone}>{c.label}</span>
          <span className="font-display font-bold tabular-nums text-parchment-50">{c.value}</span>
        </Link>
      ))}
    </div>
  );
}

// If this device has a game in progress (tab closed mid-game, wandered home),
// offer the way back in. The record is written when an online game starts and
// cleared when it ends.
function ReturnToGameBanner() {
  const [active, setActive] = useState<ActiveGame | null>(null);
  useEffect(() => {
    const stored = loadActiveGame();
    if (!stored) return;
    let cancelled = false;
    // The local record is only cleared when the game ends while this tab is
    // open. If the tab was closed mid-game, or the game ended on the opponent's
    // resignation/timeout while we were away, the record lingers (up to its
    // TTL) and wrongly claims a game is still in progress. Verify against the
    // archive before offering a rejoin: a finished game is written to Postgres
    // with a result, so a row carrying a winner or completed_at means it is
    // over -> drop the stale record and stay hidden. A 404 means it is not
    // archived yet (still live), so we fail open and offer the rejoin.
    fetch(`/api/games/${encodeURIComponent(stored.id)}`)
      .then((res) =>
        res.ok
          ? (res.json() as Promise<{ game?: { winner: unknown; completed_at: unknown } } | null>)
          : null,
      )
      .then((data) => {
        if (cancelled) return;
        const g = data?.game;
        const finished = !!g && (g.completed_at != null || g.winner != null);
        if (finished) {
          clearActiveGame(stored.id);
          return;
        }
        setActive(stored);
      })
      .catch(() => {
        if (!cancelled) setActive(stored);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  if (!active) return null;
  return (
    <Link
      href={`/game/${active.id}`}
      className="plate group mt-3 flex items-center justify-between gap-3 border-gold/50 p-3 px-4 no-underline transition-colors hover:border-gold"
    >
      <span className="flex items-center gap-2 text-sm text-parchment-100">
        <span className="h-2 w-2 shrink-0 bg-gold-leaf" />
        You have a game in progress.
      </span>
      <span className="shrink-0 font-display text-xs font-semibold text-gold-leaf">Rejoin</span>
    </Link>
  );
}

function HowItWorks() {
  const steps: { n: string; title: string; body: React.ReactNode; icon: React.ReactNode }[] = [
    {
      n: "1",
      title: "Pick your mode",
      body: (
        <>
          <span className="font-semibold text-mode-buffGlow">Buff</span> is a fair fight where you
          arm your own pieces. <span className="font-semibold text-mode-nerfGlow">Nerf</span> hands
          you a secret handicap and lets you hex your opponent.
        </>
      ),
      icon: (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M8 10h8M8 14h5" />
        </>
      ),
    },
    {
      n: "2",
      title: "Draft as you play",
      body: (
        <>
          A draft lands every 5 moves. Pick buffs, boons, or hexes from two cards; skip an offer and
          the next one rolls stronger.
        </>
      ),
      icon: (
        <>
          <path d="M12 2l2.4 6.9H21l-5.6 4 2.1 7L12 15.8 6.5 19.9l2.1-7L3 8.9h6.6z" />
        </>
      ),
    },
    {
      n: "3",
      title: "Capture the king to win",
      body: "There is no checkmate here. Read your opponent, exploit what you learn, and take the king.",
      icon: (
        <>
          <path d="M12 3v4M9 7h6M6 21h12l-1-9-4 3-1-6-1 6-4-3z" />
        </>
      ),
    },
  ];
  return (
    <section className="w-full max-w-7xl mx-auto px-5 sm:px-6 pt-10 sm:pt-12 pb-6">
      <header className="mb-4">
        <h2 className="font-display text-xl font-bold text-parchment-50">How it works</h2>
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        {steps.map((step) => {
          // The payoff step carries the most weight: its number chip takes the
          // accent so the three boxes read as a sequence, not three clones.
          const emphasized = step.n === "3";
          return (
            <div
              key={step.n}
              className="plate flex flex-col p-4 sm:p-5"
            >
              {/* One aligned header row per card: number chip, title, icon.
                  The row reserves a fixed two-line height and centers its
                  contents, so a one-line title (card 1) and a two-line title
                  (card 3) produce headers of identical height. That keeps the
                  chips, icons, and the body text below all on the same lines
                  across the grid instead of drifting off-center card to card. */}
              <div className="flex min-h-[3.25rem] items-center gap-3">
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center border font-display text-base font-bold ${
                    emphasized
                      ? "border-transparent bg-gold text-[color:var(--text-on-accent)]"
                      : "border-gold/40 text-gold-leaf"
                  }`}
                >
                  {step.n}
                </span>
                <h3 className="min-w-0 flex-1 font-display text-lg font-semibold leading-tight text-parchment-50">
                  {step.title}
                </h3>
                <svg
                  width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
                  strokeLinejoin="round" aria-hidden
                  className={"shrink-0 " + (emphasized ? "text-gold-leaf" : "text-parchment-300")}
                >
                  {step.icon}
                </svg>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-parchment-300">
                {step.body}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

type FeaturedCard = { kind: "buff" | "nerf"; id: string; name: string; tier: number; href: string; Icon: LucideIcon };

// A strip of real codex cards across a spread of tiers and both families, so a
// visitor sees the actual draft pool the moment they scroll. The card engine is
// lazy-imported (never on the landing critical path) exactly like the other
// signed-in-only reads on this page; the section skeletons in and then hides
// entirely if the import fails, so nothing here is ever faked.
function FeaturedCards() {
  const [cards, setCards] = useState<FeaturedCard[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      import("@/engine/buffs/library"),
      import("@/engine/nerfs/library"),
      import("@/lib/cardCodex"),
      import("@/lib/cardIcon"),
    ])
      .then(([buffs, nerfs, codex, icon]) => {
        if (cancelled) return;
        const pickByTier = <T extends { tier: number }>(list: T[], tiers: number[]): T[] => {
          const out: T[] = [];
          for (const t of tiers) {
            const found = list.find((c) => c.tier === t && !out.includes(c));
            if (found) out.push(found);
          }
          return out;
        };
        const buffPicks = pickByTier(buffs.ALL_BUFFS, [2, 4, 6, 8]);
        const nerfPicks = pickByTier(nerfs.ALL_NERFS, [3, 7]);
        const result: FeaturedCard[] = [
          ...buffPicks.map((b) => ({
            kind: "buff" as const,
            id: b.id,
            name: b.name,
            tier: b.tier,
            href: codex.cardPath(b),
            Icon: icon.cardFaceIcon(b.id, b.category, b.icon) ?? Sparkles,
          })),
          ...nerfPicks.map((n) => ({
            kind: "nerf" as const,
            id: n.id,
            name: n.name,
            tier: n.tier,
            href: codex.nerfPath(n.id),
            Icon: icon.nerfFaceIcon(n.id, n.icon) ?? Sparkles,
          })),
        ];
        // Interleave families so the row alternates tiers/colors rather than
        // clustering all buffs then all nerfs.
        const woven: FeaturedCard[] = [];
        const a = result.slice(0, buffPicks.length);
        const b = result.slice(buffPicks.length);
        const max = Math.max(a.length, b.length);
        for (let i = 0; i < max; i++) {
          if (a[i]) woven.push(a[i]);
          if (b[i]) woven.push(b[i]);
        }
        setCards(woven);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) return null;

  return (
    <section className="w-full max-w-7xl mx-auto px-5 sm:px-6 pt-8 pb-6">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-parchment-50">
          Draft from hundreds of cards
        </h2>
        <Link href="/codex" className="text-[13px] text-gold-leaf no-underline transition-colors hover:text-parchment-50">
          Browse the codex
        </Link>
      </header>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards
          ? cards.map((c) => (
              <Link
                key={`${c.kind}-${c.id}`}
                href={c.href}
                className="plate plate-hover group flex flex-col gap-2.5 p-3 no-underline"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center border tier-bg-${c.tier} tier-${c.tier}`}>
                    <c.Icon size={17} strokeWidth={1.8} aria-hidden />
                  </span>
                  <span
                    className={`shrink-0 border px-1.5 py-px font-display text-[12px] font-bold tier-bg-${c.tier} tier-${c.tier}`}
                    title={`Tier ${TIER_ROMAN[c.tier]}`}
                  >
                    {TIER_ROMAN[c.tier]}
                  </span>
                </div>
                <span className="truncate font-display text-[14px] leading-tight text-parchment-100">
                  {c.name}
                </span>
              </Link>
            ))
          : Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="plate flex flex-col gap-2.5 p-3" aria-hidden>
                <div className="skeleton h-9 w-9" />
                <div className="skeleton h-4 w-full" />
              </div>
            ))}
      </div>
    </section>
  );
}

type RecentGame = {
  id: string;
  whiteName: string;
  blackName: string;
  winner: "w" | "b" | "draw" | null;
  reason: string;
  rated: boolean;
  category: string;
  completedAt: number;
};

// Live activity: the most recently finished games, linked to their replays.
// Empty-safe: the whole section disappears when the archive has nothing to
// show, so no dead air.
function LiveActivity() {
  const [games, setGames] = useState<RecentGame[] | null>(null);
  const [failed, setFailed] = useState(false);
  const mountedRef = useRef(true);

  const loadGames = useCallback(() => {
    setFailed(false);
    setGames(null);
    fetch("/api/community/recent")
      .then((res) => {
        if (!res.ok) throw new Error(`recent ${res.status}`);
        return res.json() as Promise<{ games: RecentGame[] }>;
      })
      .then((data) => {
        if (mountedRef.current) setGames(data.games.slice(0, 6));
      })
      .catch(() => {
        if (mountedRef.current) setFailed(true);
      });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    // Deferred a microtask so loadGames' synchronous reset does not cascade
    // renders during the effect body.
    queueMicrotask(() => {
      if (mountedRef.current) loadGames();
    });
    return () => {
      mountedRef.current = false;
    };
  }, [loadGames]);

  // Empty-safe: nothing archived yet -> render nothing at all. The fetch has
  // settled to an empty list here, never a still-pending or failed load.
  if (!failed && games !== null && games.length === 0) return null;

  const modeOf = (category: string) => (category === "nerf" || category === "buff" ? category : undefined);

  return (
    <section className="w-full max-w-7xl mx-auto px-5 sm:px-6 pt-8 pb-6">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-parchment-50">Live activity</h2>
        <Link href="/community" className="text-[13px] text-gold-leaf no-underline transition-colors hover:text-parchment-50">
          More in the community
        </Link>
      </header>
      <div className="plate divide-y divide-[color:var(--edge)] p-1">
        {failed ? (
          <div role="alert" className="flex flex-col items-start gap-2.5 px-3 py-5">
            <p className="text-[14px] text-parchment-300">Live activity could not load right now.</p>
            <div className="flex items-center gap-2">
              <Button tone="ghost" onClick={loadGames} className="px-3 py-1.5 text-[13px]">
                Retry
              </Button>
              <Link href="/lobby" className="text-[13px] text-parchment-400 no-underline transition-colors hover:text-parchment-100">
                Back to lobby
              </Link>
            </div>
          </div>
        ) : games
          ? games.map((g) => (
              <Link
                key={g.id}
                href={`/game/${g.id}`}
                aria-label={`Replay ${g.whiteName} versus ${g.blackName}`}
                className="group flex items-center justify-between gap-3 px-3 py-2.5 no-underline transition-colors hover:bg-[color:var(--surface-hover)]"
              >
                <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[14px] text-parchment-100">
                  <PlayerNameInline name={g.whiteName} />
                  <span className="text-parchment-400">vs</span>
                  <PlayerNameInline name={g.blackName} />
                  <ModeBadge mode={modeOf(g.category)} compact />
                </span>
                <span className="flex shrink-0 items-center gap-2.5">
                  <span className="font-mono text-[13px] tabular-nums text-parchment-200">
                    {resultLabel(g.winner)}
                  </span>
                  <span className="hidden text-[12px] text-parchment-400 sm:inline">{timeAgo(g.completedAt)}</span>
                  <span aria-hidden className="text-parchment-500 transition-transform group-hover:translate-x-0.5 group-hover:text-gold-leaf">
                    →
                  </span>
                </span>
              </Link>
            ))
          : Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-3 py-2.5" aria-hidden>
                <div className="skeleton h-5 w-full" />
              </div>
            ))}
      </div>
    </section>
  );
}

// A name links to its profile. Every account renders the same way here; no
// labels or chips distinguish one kind of account from another.
function PlayerNameInline({ name }: { name: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <Link href={`/u/${encodeURIComponent(name)}`} className="truncate hover:text-gold-leaf">
        {name}
      </Link>
    </span>
  );
}

function resultLabel(winner: "w" | "b" | "draw" | null): string {
  if (winner === "w") return "1-0";
  if (winner === "b") return "0-1";
  if (winner === "draw") return "½-½";
  return "·";
}

function timeAgo(at: number): string {
  const s = Math.max(1, Math.floor((Date.now() - at) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Community proof at the foot of the page: how many people are here right now,
// the doors into the wider site, and the socials row (kept, restyled quiet).
function CommunityProof() {
  const lobby = useLobbySnapshot(10000);
  const online = lobby ? lobby.players.length + lobby.anonymous : null;
  const links: { href: string; label: string; Icon: LucideIcon }[] = [
    { href: "/community", label: "Community", Icon: Users },
    { href: "/leaderboard", label: "Leaderboard", Icon: Trophy },
    { href: "/tv", label: "Watch TV", Icon: Tv },
  ];
  return (
    <section className="w-full max-w-7xl mx-auto px-5 sm:px-6 pt-8 pb-4">
      <div className="plate flex flex-col items-center gap-5 p-6 text-center sm:p-8">
        {online !== null && (
          <p className="text-[15px] text-parchment-200">
            <span className="font-display text-xl font-bold tabular-nums text-parchment-50">{online}</span>{" "}
            {online === 1 ? "player" : "players"} online right now.
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {links.map(({ href, label, Icon }) => (
            <LinkButton tone="ghost"
              key={href}
              href={href}
              className="flex px-4 py-2 text-[14px]">
              <Icon size={16} aria-hidden />
              {label}
            </LinkButton>
          ))}
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  const footerLinks = [
    { href: "/contact", label: "Contact" },
    { href: "/guidelines", label: "Guidelines" },
    { href: "/privacy-policy", label: "Privacy policy" },
    { href: "/terms-of-service", label: "Terms of service" },
    { href: "/about", label: "About" },
    { href: "/faq", label: "FAQ" },
  ];

  return (
    <footer className="max-w-7xl mx-auto w-full px-6 py-8">
      <nav
        aria-label="Footer"
        className="flex flex-wrap items-center justify-center sm:justify-end gap-y-2 text-xs text-parchment-400"
      >
        {footerLinks.map((link, index) => (
          <span key={link.href} className="flex items-center">
            {index > 0 && <span aria-hidden="true" className="mx-3 opacity-50">|</span>}
            <Link href={link.href} className="transition-colors hover:text-parchment">
              {link.label}
            </Link>
          </span>
        ))}
      </nav>
      <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-parchment-400">
        <span className="opacity-70">Nerf Chess</span>
        <BuildVersionLabel />
      </div>
    </footer>
  );
}

// The deployed build/version stamp is an operator detail, not visitor-facing.
// It is rendered only for moderators and admins. The role is resolved the same
// way the rest of the page reads the viewer (fetchMe from the account API), in
// a client effect after first paint, so signed-out visitors and still-loading
// JavaScript never see it and it never reserves layout: nothing renders until
// a moderator is confirmed.
function BuildVersionLabel() {
  const [isModerator, setIsModerator] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetchMe().then((me) => {
      if (cancelled || !me || me.isGuest) return;
      if (me.role === "mod" || me.role === "admin") setIsModerator(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const version = process.env.NEXT_PUBLIC_BUILD_VERSION ?? "";
  if (!isModerator || !version) return null;
  return (
    <span className="font-mono text-[10px] opacity-70" title="Deployed version">
      {version}
    </span>
  );
}
