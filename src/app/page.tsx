"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, Trophy, Tv, Users, type LucideIcon } from "lucide-react";
import { HeroTv } from "@/components/HeroTv";
import { SiteHeader } from "@/components/SiteHeader";
import { StarField } from "@/components/StarField";
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

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      <StarField />
      <SiteHeader />

      {/* Hero: the live featured board on the left, the action column on the
          right. The board sells the product; the copy explains it in one
          breath; Open Lobby is the single primary way in. */}
      <section className="w-full max-w-7xl mx-auto px-5 sm:px-6 pt-3 pb-10 sm:pt-7 grid lg:grid-cols-[minmax(0,1fr)_430px] gap-10 lg:gap-12 items-center">
        <div className="order-2 lg:order-1 animate-rise">
          <HeroTv />
          {/* Socials live right under the hero board (owner request: back to
              its original spot). */}
          <div className="mt-4">
            <SocialsRow />
          </div>
        </div>

        {/* The action column is kept short on purpose: it should never run
            taller than the board beside it. */}
        <div className="order-1 lg:order-2 stagger-in">
          {/* Eyebrow row, with a quiet onboarding door parked in the upper
              right. It drops brand-new players straight into the built-in
              guided tutorial: a real game against the easiest bot with coach
              marks over the live board. */}
          <div className="flex items-start justify-between gap-3">
            <span className="eyebrow">Nerf Chess</span>
            <NewHereChip />
          </div>

          {/* The one-breath pitch: what the two words on the tin actually
              change. Concrete, not marketing air. */}
          <p className="mt-3 text-[15px] leading-snug text-parchment-300">
            Every five moves you draft a card. In{" "}
            <span className="font-semibold text-mode-buffGlow">Buff</span> mode you stack powers
            onto your own army; in <span className="font-semibold text-mode-nerfGlow">Nerf</span>{" "}
            mode you start with a secret handicap and curse your opponent. Capture the king to win.
          </p>

          {/* ONE dominant action, on the theme accent. It enters the lobby's
              Quick Play tab, where Buff and 3+2 are already selected, so the
              next click is the matchmaking button. */}
          <Link
            href="/lobby"
            className="btn-leaf btn-cta press mt-5 flex w-full items-center justify-center gap-3 px-6 py-6 font-display text-3xl sm:text-4xl font-bold no-underline"
          >
            Open lobby
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </Link>

          {/* Two quieter ways in, one step below the big button. No mode
              decision here: Buff is the site-wide default, and every setup
              page lets you switch. No third "play online" clone; Open lobby
              already is that. */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/lobby?tab=friends"
              className="btn-glass press flex items-center justify-center gap-2 px-4 py-3 font-display text-[15px] font-medium"
            >
              Play a friend
            </Link>
            <Link
              href="/play"
              className="btn-glass press flex items-center justify-center gap-2 px-4 py-3 font-display text-[15px] font-medium"
            >
              Play a bot
            </Link>
          </div>

          <LiveNowStrip />
          <HeroRatings />
          <ReturnToGameBanner />

          {/* What the two words on the tin actually mean. Each card is a link
              into that mode's guide; the titles carry the mode colors and the
              cards carry mode-hue edges, at equal prominence. */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link href="/guide/buff-mode" className="mode-def-card mode-def-card--buff plate block p-4 no-underline">
              <span className="font-display text-lg font-bold text-mode-buffGlow">Buff mode</span>
              <ul className="mt-2 space-y-1 text-sm leading-snug text-parchment-300">
                <li>Both armies play fair.</li>
                <li>Draft powers onto your own pieces.</li>
                <li>Stack buffs into a war machine.</li>
              </ul>
            </Link>
            <Link href="/guide/nerf-mode" className="mode-def-card mode-def-card--nerf plate block p-4 no-underline">
              <span className="font-display text-lg font-bold text-mode-nerfGlow">Nerf mode</span>
              <ul className="mt-2 space-y-1 text-sm leading-snug text-parchment-300">
                <li>You start with a secret handicap.</li>
                <li>Curse your opponent with hexes.</li>
                <li>Draft boons to dig yourself out.</li>
              </ul>
            </Link>
          </div>
        </div>
      </section>

      <SeamDivider />
      <HowItWorks />
      <FeaturedCards />
      <LiveActivity />
      <CommunityProof />

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
      className="mt-3 flex items-center justify-center gap-2 text-[13px] text-parchment-300 no-underline transition-colors hover:text-parchment-100"
    >
      <span className="dot-live h-2 w-2 shrink-0 bg-verdigris" />
      <span>
        <span className="font-display font-bold tabular-nums text-parchment-50">{online}</span>{" "}
        playing now
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
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <span key={c.key} className={`flex items-center gap-1.5 border px-2.5 py-1 text-[13px] ${c.edge}`}>
          <span className={c.tone}>{c.label}</span>
          <span className="font-display font-bold tabular-nums text-parchment-50">{c.value}</span>
        </span>
      ))}
      <Link
        href={`/u/${encodeURIComponent(user.username)}`}
        className="text-[13px] text-parchment-400 no-underline transition-colors hover:text-parchment-100"
      >
        Full profile →
      </Link>
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
      className="plate group mt-4 flex items-center justify-between gap-3 border border-gold/40 bg-gold/10 p-3 px-4 no-underline transition-colors hover:border-gold/70"
    >
      <span className="flex items-center gap-2 text-sm text-parchment-100">
        <span className="w-2 h-2 bg-gold-leaf animate-flicker" />
        You have a game in progress.
      </span>
      <span className="flex shrink-0 items-center gap-1.5 font-display text-xs font-semibold tracking-wide text-gold-leaf">
        Rejoin
        <span aria-hidden className="motion-safe:transition-transform motion-safe:duration-200 group-hover:translate-x-0.5">
          &rarr;
        </span>
      </span>
    </Link>
  );
}

// The signature mode seam as a section rule: warm Nerf meeting cool Buff at a
// single flat bead. It carries the two-mode identity down the whole page.
function SeamDivider() {
  return (
    <div className="w-full max-w-7xl mx-auto px-5 sm:px-6" aria-hidden>
      <hr className="mode-seam" />
    </div>
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
      <header className="mb-5">
        <h2 className="display-3 text-parchment-50">How it works</h2>
      </header>
      <div className="stagger-in grid gap-4 sm:grid-cols-3">
        {steps.map((step) => {
          // The payoff step carries the most weight: it gets the accent gilt
          // edge so the three cards read as a sequence, not three clones.
          const emphasized = step.n === "3";
          return (
            <div
              key={step.n}
              className={`plate relative flex flex-col overflow-hidden p-5 sm:p-6 ${emphasized ? "gilt" : ""}`}
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
                      ? "border-gold/70 bg-gold/15 text-gold-leaf"
                      : "border-gold/40 bg-gold/10 text-gold-leaf"
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
        <h2 className="display-3 text-parchment-50">Draft from hundreds of cards</h2>
        <Link href="/codex" className="text-[13px] text-gold-leaf no-underline transition-colors hover:text-parchment-50">
          Browse the codex →
        </Link>
      </header>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards
          ? cards.map((c) => (
              <Link
                key={`${c.kind}-${c.id}`}
                href={c.href}
                className="plate group flex flex-col gap-2.5 p-3 no-underline transition-colors hover:border-gold/40"
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

// Live activity: the most recently finished games, linked to their replays,
// with House Bot labels wherever a bot's name renders. Empty-safe: the whole
// section disappears when the archive has nothing to show, so no dead air.
function LiveActivity() {
  const [games, setGames] = useState<RecentGame[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [botNames, setBotNames] = useState<Set<string>>(new Set());
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
    // House-bot names come from the leaderboard's own bot flag, so a bot is
    // labeled here exactly as it is on the community hub.
    fetch("/api/leaderboard?category=nerf")
      .then((res) => (res.ok ? (res.json() as Promise<{ players: { username: string; bot?: number }[] }>) : null))
      .then((data) => {
        if (mountedRef.current && data)
          setBotNames(new Set(data.players.filter((p) => p.bot).map((p) => p.username.toLowerCase())));
      })
      .catch(() => {});
    return () => {
      mountedRef.current = false;
    };
  }, [loadGames]);

  // Empty-safe: nothing archived yet -> render nothing at all. The fetch has
  // settled to an empty list here, never a still-pending or failed load.
  if (!failed && games !== null && games.length === 0) return null;

  const isBot = (name: string) => botNames.has(name.toLowerCase());
  const modeOf = (category: string) => (category === "nerf" || category === "buff" ? category : undefined);

  return (
    <section className="w-full max-w-7xl mx-auto px-5 sm:px-6 pt-8 pb-6">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h2 className="display-3 text-parchment-50">Live activity</h2>
        <Link href="/community" className="text-[13px] text-gold-leaf no-underline transition-colors hover:text-parchment-50">
          More in the community →
        </Link>
      </header>
      <div className="plate divide-y divide-[color:var(--edge)] p-1">
        {failed ? (
          <div role="alert" className="flex flex-col items-start gap-2.5 px-3 py-5">
            <p className="text-[14px] text-parchment-300">Live activity could not load right now.</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={loadGames} className="btn-ghost press px-3 py-1.5 text-[13px]">
                Retry
              </button>
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
                  <PlayerNameInline name={g.whiteName} isBot={isBot} />
                  <span className="text-parchment-400">vs</span>
                  <PlayerNameInline name={g.blackName} isBot={isBot} />
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

// A name links to its profile; a House engine account wears the outline chip
// everywhere its name renders (design system section 7).
function PlayerNameInline({ name, isBot }: { name: string; isBot: (name: string) => boolean }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <Link href={`/u/${encodeURIComponent(name)}`} className="truncate hover:text-gold-leaf">
        {name}
      </Link>
      {isBot(name) && (
        <span className="shrink-0 whitespace-nowrap border border-[color:var(--edge-strong)] px-1.5 py-0.5 text-[12px] uppercase tracking-[0.06em] text-parchment-400">
          House bot
        </span>
      )}
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
            <Link
              key={href}
              href={href}
              className="btn-ghost press flex items-center gap-2 px-4 py-2 text-[14px] no-underline"
            >
              <Icon size={16} aria-hidden />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// The socials chip row, restyled quiet: muted label, small ghost chips.
function SocialsRow() {
  const socials: { href: string; label: string; icon: React.ReactNode }[] = [
    {
      href: "https://discord.gg/a5bJYFrTx",
      label: "Discord",
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
      ),
    },
    {
      href: "https://www.instagram.com/officialnerfchess",
      label: "Instagram",
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </svg>
      ),
    },
    {
      href: "https://tiktok.com/@nerfchess",
      label: "TikTok",
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
        </svg>
      ),
    },
    {
      href: "https://www.youtube.com/@OfficialNerfChess",
      label: "YouTube",
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
          <path d="m10 15 5-3-5-3z" />
        </svg>
      ),
    },
  ];
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span className="mr-1 text-[12px] text-parchment-400">Socials</span>
      {socials.map((s) => (
        <a
          key={s.label}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost flex items-center gap-2 px-3 py-1.5 text-[13px] no-underline"
        >
          {s.icon}
          {s.label}
        </a>
      ))}
    </div>
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
        <span className="font-mono text-[10px] opacity-70" title="Deployed version">
          {process.env.NEXT_PUBLIC_BUILD_VERSION ?? ""}
        </span>
      </div>
    </footer>
  );
}
