"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HeroTv } from "@/components/HeroTv";
import { SiteHeader } from "@/components/SiteHeader";
import { StarField } from "@/components/StarField";
// NOTE: the card libraries (ALL_BUFFS / ALL_NERFS) are NOT imported statically.
// They transitively pull the entire card engine (~12k lines) into the home
// page's client bundle just to show two `.length` counts — a large parse +
// execute cost on the landing page for low-end devices. StatStrip lazy-imports
// them, and only for signed-in users, so the engine never ships in this chunk.
import { useLobbySnapshot } from "@/lib/lobbyClient";
import { AccountUser, fetchMe } from "@/lib/authClient";
import { ActiveGame, loadActiveGame, clearActiveGame } from "@/lib/multiplayer";
import { NewHereChip } from "@/components/NewHereChip";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      <StarField />
      <SiteHeader />

      {/* Hero, from the paper sketch: the top played board on the left (the
          star, on a raised glass panel), the OPEN LOBBY column on the right
          (crisp and readable, one step quieter than the TV). */}
      <section className="w-full max-w-7xl mx-auto px-5 sm:px-6 pt-3 pb-12 sm:pt-7 grid lg:grid-cols-[minmax(0,1fr)_410px] gap-10 lg:gap-12 items-center">
        <div className="order-1 animate-rise">
          <HeroTv />
          {/* Desktop only here; on phones the socials live at the very bottom
              of the page so the play actions come first in the scroll. */}
          <div className="hidden lg:block">
            <SocialsRow />
          </div>
        </div>

        {/* The action column is kept short on purpose: it should never run
            taller than the board beside it. */}
        <div className="order-2 stagger-in">
          {/* Eyebrow row, with a quiet onboarding door parked in the upper
              right. It drops brand-new players straight into the built-in
              guided tutorial: a real game against the easiest bot with coach
              marks over the live board. */}
          <div className="flex items-start justify-between gap-3">
            <span className="eyebrow">Nerf Chess</span>
            <NewHereChip />
          </div>
          {/* ONE dominant action. It enters the lobby's Quick Play tab, where
              Buff and 3+2 are already selected, so the next click is the
              matchmaking button. */}
          <h1 className="mt-2">
            <Link
              href="/lobby"
              className="btn-sky btn-cta w-full flex items-center justify-center gap-3 px-6 py-6 font-display text-3xl sm:text-4xl font-bold uppercase tracking-[0.05em] no-underline motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out motion-safe:hover:-translate-y-px motion-safe:active:scale-[0.98]"
            >
              Open Lobby
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            </Link>
          </h1>

          <LiveNowStrip />

          <ReturnToGameBanner />

          {/* Two quieter ways in, one step below the big button. No mode
              decision here: Buff is the site-wide default, and every setup
              page lets you switch. */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 border border-white/10 bg-white/[0.04] p-4">
            <Link
              href="/lobby"
              className="btn-glass btn-glass--primary flex items-center justify-center gap-2 px-4 py-3.5 font-display text-base font-medium motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out motion-safe:hover:-translate-y-px motion-safe:active:scale-[0.98]"
            >
              Play Online
            </Link>
            <Link
              href="/lobby?tab=friends"
              className="btn-glass flex items-center justify-center gap-2 px-4 py-3.5 font-display text-base font-medium motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out motion-safe:hover:-translate-y-px motion-safe:active:scale-[0.98]"
            >
              Play a Friend
            </Link>
          </div>

          {/* What the two words on the tin actually mean. Each card is a link
              into that mode's lobby; the titles carry the mode colors. */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link href="/lobby?mode=buff" className="mode-def-card mode-def-card--buff plate block p-5 no-underline">
              <span className="font-display text-lg font-bold uppercase tracking-wide text-mode-buffGlow underline decoration-mode-buff/60 decoration-2 underline-offset-4">
                Buff
              </span>
              <p className="mt-2 text-[13px] leading-snug text-parchment-300">
                Start with normal chess. Draft{" "}
                <span className="text-parchment-100">powers</span> for your own army.
              </p>
            </Link>
            <Link href="/lobby?mode=nerf" className="mode-def-card mode-def-card--nerf plate block p-5 no-underline">
              <span className="font-display text-lg font-bold uppercase tracking-wide text-mode-nerfGlow underline decoration-mode-nerf/60 decoration-2 underline-offset-4">
                Nerf
              </span>
              <p className="mt-2 text-[13px] leading-snug text-parchment-300">
                Start with a secret <span className="text-parchment-100">handicap</span>.
                Draft curses for your opponent.
              </p>
            </Link>
          </div>

        </div>
      </section>

      {/* The knight plays Geometry Dash: a long scrolling course of blocks
          and spikes slides by while the knight-cube jumps them on the beat.
          The home screen's one purely-for-fun animation — pure CSS, one loop,
          hidden under reduced motion. */}
      <div className="knight-track w-full max-w-7xl mx-auto px-5 sm:px-6" aria-hidden>
        <span className="gd-world">
          {/* Two identical halves so the 200%-wide strip loops seamlessly.
              Obstacles sit every 12.5% of the strip; the knight's jump is
              phase-locked to that spacing. */}
          {[0, 1].map((half) =>
            [0, 1, 2, 3, 4, 5, 6, 7].map((slot) => {
              const left = half * 50 + 4.5 + slot * 6.25; // % of the strip
              return (
                <span key={`${half}-${slot}`} className="gd-obstacle" style={{ left: `${left}%` }}>
                  {/* Eight distinct structures, GD-style: lone spike, block,
                      double spike, block+spike step, triple spike, stacked
                      tower, spike-block-spike gauntlet, low platform with a
                      spike on top. */}
                  {slot === 0 && <i className="gd-spike" />}
                  {slot === 1 && <i className="gd-block" />}
                  {slot === 2 && (
                    <>
                      <i className="gd-spike" />
                      <i className="gd-spike" />
                    </>
                  )}
                  {slot === 3 && (
                    <>
                      <i className="gd-block" />
                      <i className="gd-spike" />
                    </>
                  )}
                  {slot === 4 && (
                    <>
                      <i className="gd-spike" />
                      <i className="gd-spike" />
                      <i className="gd-spike" />
                    </>
                  )}
                  {slot === 5 && <i className="gd-block gd-block--tall" />}
                  {slot === 6 && (
                    <>
                      <i className="gd-spike" />
                      <i className="gd-block" />
                      <i className="gd-spike" />
                    </>
                  )}
                  {slot === 7 && (
                    <span className="gd-stack">
                      <i className="gd-spike gd-spike--small" />
                      <i className="gd-platform" />
                    </span>
                  )}
                </span>
              );
            }),
          )}
        </span>
        <span className="gd-knight">
          <span>♞</span>
        </span>
      </div>

      <StatStrip />
      <SeamDivider />
      <HowItWorks />

      {/* Phones get the socials here, below everything, so the scroll reaches
          play actions first. Desktop shows them under the TV instead. */}
      <div className="lg:hidden pb-6">
        <SocialsRow />
      </div>

      <SiteFooter />
    </main>
  );
}

// The sketch's SOCIALS card, as a chip row under the TV: Discord, Instagram,
// and TikTok (all @nerfchess).
function SocialsRow() {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
      <span className="smallcaps mr-1 text-[11px] text-parchment-400">Socials</span>
      <a
        href="https://discord.gg/a5bJYFrTx"
        target="_blank"
        rel="noopener noreferrer"
        className="btn-ghost flex items-center gap-2.5 px-5 py-2.5 text-base no-underline"
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
        Discord
      </a>
      <a
        href="https://www.instagram.com/officialnerfchess"
        target="_blank"
        rel="noopener noreferrer"
        className="btn-ghost flex items-center gap-2.5 px-5 py-2.5 text-base no-underline"
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </svg>
        Instagram
      </a>
      <a
        href="https://tiktok.com/@nerfchess"
        target="_blank"
        rel="noopener noreferrer"
        className="btn-ghost flex items-center gap-2.5 px-5 py-2.5 text-base no-underline"
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
        </svg>
        TikTok
      </a>
      <a
        href="https://www.youtube.com/@OfficialNerfChess"
        target="_blank"
        rel="noopener noreferrer"
        className="btn-ghost flex items-center gap-2.5 px-5 py-2.5 text-base no-underline"
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
          <path d="m10 15 5-3-5-3z" />
        </svg>
        YouTube
      </a>
    </div>
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

// The live pulse right under the lobby button: how many people are here and
// how many games are running, so a new visitor sees immediately that there is
// someone to play. Always rendered; counts skeleton in while the first lobby
// snapshot loads.
function LiveNowStrip() {
  const lobby = useLobbySnapshot(10000);
  const online = lobby ? lobby.players.length + lobby.anonymous : null;
  const games = lobby ? lobby.games.length : null;
  const stat = (value: number | null, label: string, dotClass: string) => (
    <span className="flex items-center gap-2.5">
      <span className={"h-2.5 w-2.5 shrink-0 " + dotClass} />
      {value === null ? (
        <span className="skeleton inline-block h-5 w-24" />
      ) : (
        <span className="text-parchment-100">
          <span className="font-display text-lg font-bold tabular-nums text-parchment-50">{value}</span>{" "}
          {label}
          {value === 1 ? "" : "s"}
        </span>
      )}
    </span>
  );
  return (
    <Link
      href="/lobby"
      className="plate mt-3 flex flex-wrap items-center justify-center gap-x-7 gap-y-1.5 border border-white/10 px-4 py-2.5 no-underline transition-colors hover:border-gold/40"
    >
      {stat(online, "player", "dot-live bg-verdigris")}
      {stat(games, "live game", "dot-live bg-oxblood-glow")}
    </Link>
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

// A signed-in player sees their two mode ratings next to the size of the card
// library (buff and nerf counts come straight from the engine constants).
// Signed out, a single-line invite takes the strip's place.
function StatStrip() {
  const [user, setUser] = useState<AccountUser | null | undefined>(undefined);
  const [modeRatings, setModeRatings] = useState<Partial<Record<"nerf" | "buff", number>>>({});
  // Deck counts, lazy-loaded so the card engine stays out of the home bundle.
  const [deckCounts, setDeckCounts] = useState<{ buffs: number; nerfs: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMe().then((me) => {
      if (cancelled) return;
      setUser(me);
      if (!me) return;
      // Signed in: pull the card libraries in their own async chunk (never on
      // the landing-page critical path) to read the deck sizes.
      Promise.all([import("@/engine/buffs/library"), import("@/engine/nerfs/library")])
        .then(([buffs, nerfs]) => {
          if (!cancelled) setDeckCounts({ buffs: buffs.ALL_BUFFS.length, nerfs: nerfs.ALL_NERFS.length });
        })
        .catch(() => {});
      fetch(`/api/users/${encodeURIComponent(me.username)}`)
        .then((res) => (res.ok ? res.json() : null) as Promise<{ ratings?: Record<string, { rating: number }> } | null>)
        .then((data) => {
          if (cancelled || !data?.ratings) return;
          setModeRatings({
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

  if (user === undefined) return null;

  if (!user) {
    return (
      <section className="w-full max-w-7xl mx-auto px-5 sm:px-6 py-4">
        <div className="plate flex flex-wrap items-center justify-between gap-3 p-4 px-5">
          <span className="text-sm text-parchment-200">
            Play one game and your ratings will show up here.
          </span>
          <Link
            href="/lobby"
            className="btn-glass btn-glass--primary px-4 py-2 font-display text-sm font-semibold"
          >
            Find an opponent
          </Link>
        </div>
      </section>
    );
  }

  const fallback = Math.round(user.rating);
  // The two ratings drop the spelled-out mode: the number, the tick, and the
  // label all wear the mode color (rose = Nerf, sky = Buff, matching the mode
  // cards above), so the hue names the pool instead of the word. The deck
  // counts keep the neutral muted label.
  const stats = [
    { key: "nerf", value: String(modeRatings.nerf ?? fallback), label: "Rating", tone: "text-mode-nerfGlow", tick: "bg-mode-nerf/70", labelTone: "text-mode-nerfGlow" },
    { key: "buff", value: String(modeRatings.buff ?? fallback), label: "Rating", tone: "text-mode-buffGlow", tick: "bg-mode-buff/70", labelTone: "text-mode-buffGlow" },
    { key: "buffs", value: deckCounts ? deckCounts.buffs.toLocaleString() : "…", label: "buffs in the deck", tone: "text-parchment-50", tick: "bg-sun/70", labelTone: "text-parchment-400" },
    { key: "nerfs", value: deckCounts ? deckCounts.nerfs.toLocaleString() : "…", label: "nerfs in the deck", tone: "text-parchment-50", tick: "bg-mint/70", labelTone: "text-parchment-400" },
  ];
  return (
    <section className="w-full max-w-7xl mx-auto px-5 sm:px-6 py-4">
      <div className="plate relative p-6 sm:p-7">
        <span aria-hidden className="card-corner tl" />
        <span aria-hidden className="card-corner tr" />
        <span aria-hidden className="card-corner bl" />
        <span aria-hidden className="card-corner br" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="kicker smallcaps text-[10px]">At a glance</div>
          <Link
            href={`/u/${encodeURIComponent(user.username)}`}
            className="smallcaps text-[10px] text-parchment-400 transition-colors hover:text-parchment-100"
          >
            Full profile →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-y-5 sm:grid-cols-4 sm:divide-x sm:divide-white/10">
          {stats.map((s) => (
            <div key={s.key} className="px-2 sm:px-6 text-center">
              <div className={`font-display text-3xl sm:text-4xl font-bold tabular-nums ${s.tone}`}>
                {s.value}
              </div>
              <span aria-hidden className={`mx-auto mt-2.5 block h-1 w-8 ${s.tick}`} />
              <div className={`mt-2 smallcaps text-[9px] sm:text-[10px] ${s.labelTone}`}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps: { n: string; title: string; body: React.ReactNode; icon: React.ReactNode }[] = [
    {
      n: "1",
      title: "Pick your mode",
      body: (
        <>
          In <span className="font-semibold text-mode-nerfGlow">Nerf</span> mode you pick a
          secret handicap from two cards; your opponent&apos;s stays hidden until the game
          ends. In <span className="font-semibold text-mode-buffGlow">Buff</span> mode nobody
          is handicapped.
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
          A draft lands every 5 moves. In <span className="font-semibold text-mode-nerfGlow">Nerf</span>{" "}
          mode you pick hexes that curse your opponent, or boons for yourself. In{" "}
          <span className="font-semibold text-mode-buffGlow">Buff</span> mode you draft buffs
          and build the strongest army. Skip one and the next offer rolls stronger.
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
    <section className="w-full max-w-7xl mx-auto px-5 sm:px-6 pt-10 sm:pt-14 pb-8">
      <header className="mb-6">
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

function SiteFooter() {
  const footerLinks = [
    { href: "/contact", label: "Contact" },
    { href: "/guidelines", label: "Guidelines" },
    { href: "/privacy-policy", label: "Privacy policy" },
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
