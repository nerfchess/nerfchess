"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HeroTv } from "@/components/HeroTv";
import { SiteHeader } from "@/components/SiteHeader";
import { ALL_NERFS } from "@/engine/nerfs/library";
import { ALL_BUFFS } from "@/engine/buffs/library";
import { useLobbySnapshot } from "@/lib/lobbyClient";
import { AccountUser, fetchMe } from "@/lib/authClient";
import { ActiveGame, loadActiveGame } from "@/lib/multiplayer";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />

      {/* Hero, from the paper sketch: the top played board on the left (the
          star — it wears the seam-gradient TV frame and a breathing aura), the
          OPEN LOBBY column on the right (crisp and readable, one step quieter
          than the TV). */}
      <section className="mode-field w-full max-w-7xl mx-auto px-5 sm:px-6 pt-3 pb-12 sm:pt-7 grid lg:grid-cols-[minmax(0,1fr)_410px] gap-10 lg:gap-12 items-center">
        <div className="order-1 animate-rise">
          <HeroTv />
          <SocialsRow />
        </div>

        {/* The action column is kept short on purpose: it should never run
            taller than the board beside it. */}
        <div className="order-2 stagger-in">
          <span className="eyebrow">Nerf Chess</span>
          {/* OPEN LOBBY: the accent blue, clickable straight into the lobby,
              with an underline that sweeps in on load. */}
          <Link href="/lobby" className="group mt-2 block w-fit no-underline">
            <h1 className="title-underline font-display text-4xl sm:text-[2.9rem] font-bold uppercase leading-none tracking-[0.04em] text-gold-leaf transition-colors group-hover:text-gold">
              Open Lobby
            </h1>
          </Link>
          <p className="mt-3 text-[15px] leading-relaxed text-parchment-200">
            Chess with a deck: draft cards as you play, and capture the king to win.
          </p>

          {/* What the two words on the tin actually mean. Each card is a link
              into that mode's lobby; the titles carry the mode colors. */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link href="/lobby?mode=nerf" className="mode-def-card mode-def-card--nerf plate block p-3.5 no-underline">
              <span className="font-display text-lg font-bold uppercase tracking-wide text-mode-nerfGlow underline decoration-mode-nerf/60 decoration-2 underline-offset-4">
                Nerf
              </span>
              <p className="mt-2 text-[13px] leading-snug text-parchment-300">
                A <span className="text-parchment-100">handicap card</span> that weakens
                pieces. You start with one — then draft more onto your opponent.
              </p>
            </Link>
            <Link href="/lobby?mode=buff" className="mode-def-card mode-def-card--buff plate block p-3.5 no-underline">
              <span className="font-display text-lg font-bold uppercase tracking-wide text-mode-buffGlow underline decoration-mode-buff/60 decoration-2 underline-offset-4">
                Buff
              </span>
              <p className="mt-2 text-[13px] leading-snug text-parchment-300">
                A <span className="text-parchment-100">power-up card</span> that
                strengthens your pieces. Draft them to build the stronger army.
              </p>
            </Link>
          </div>

          <ReturnToGameBanner />

          {/* Action hierarchy: playing a real person is THE flow. One big
              primary into the lobby, two quieter options below it, all on a
              flat bordered panel so the column reads as one control cluster. */}
          <div className="mt-4 flex flex-col gap-3 border border-white/10 bg-white/[0.04] p-4">
            <Link
              href="/lobby"
              className="btn-grass btn-cta cta-shine w-full flex items-center justify-center gap-3 px-8 py-5 font-display text-xl sm:text-2xl font-semibold motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out motion-safe:hover:-translate-y-px motion-safe:active:scale-[0.98]"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Play Someone
            </Link>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/game?mode=ai"
                className="btn-glass flex items-center justify-center gap-2 px-4 py-3 font-display text-base font-medium motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out motion-safe:hover:-translate-y-px motion-safe:active:scale-[0.98]"
              >
                Play a Bot
              </Link>
              <Link
                href="/friend"
                className="btn-glass flex items-center justify-center gap-2 px-4 py-3 font-display text-base font-medium motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out motion-safe:hover:-translate-y-px motion-safe:active:scale-[0.98]"
              >
                Play a Friend
              </Link>
            </div>
          </div>

          <LiveNowStrip />

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-parchment-300">
            <Link href="/play" className="hover:text-parchment-100 transition-colors">Custom game</Link>
            <span aria-hidden className="opacity-30">·</span>
            <Link href="/tutorial" className="hover:text-parchment-100 transition-colors">How it works</Link>
            <span aria-hidden className="opacity-30">·</span>
            <Link href="/codex" className="hover:text-parchment-100 transition-colors">Browse the rules</Link>
          </div>
        </div>
      </section>

      <StatStrip />
      <SeamDivider />
      <HowItWorks />

      <SiteFooter />
    </main>
  );
}

// The sketch's SOCIALS card, as a quiet chip row under the TV: only channels
// that really exist (Discord, Instagram) — add TikTok/YouTube here once those
// accounts are live.
function SocialsRow() {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
      <span className="smallcaps mr-1 text-[10px] text-parchment-400">Socials</span>
      <a
        href="https://discord.gg/a5bJYFrTx"
        target="_blank"
        rel="noopener noreferrer"
        className="btn-ghost flex items-center gap-2 px-3.5 py-1.5 text-sm no-underline"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
        Discord
      </a>
      <a
        href="https://instagram.com/nerfchess"
        target="_blank"
        rel="noopener noreferrer"
        className="btn-ghost flex items-center gap-2 px-3.5 py-1.5 text-sm no-underline"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </svg>
        Instagram
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

// A live pulse under the primary action: who's online and what's being played
// right now, so a new visitor sees immediately that there are people to play.
function LiveNowStrip() {
  const lobby = useLobbySnapshot(10000);
  if (!lobby) return null;
  const online = lobby.players.length + lobby.anonymous;
  return (
    <Link
      href="/lobby"
      className="plate mt-3 flex items-center justify-between gap-3 border border-white/10 p-3 px-4 no-underline transition-colors hover:border-gold/40"
    >
      <span className="flex items-center gap-2 text-sm text-parchment-200">
        <span className="w-2 h-2 bg-verdigris animate-flicker" />
        {online} player{online === 1 ? "" : "s"} online
        {lobby.games.length > 0 && (
          <span className="text-parchment-400">
            · {lobby.games.length} live game{lobby.games.length === 1 ? "" : "s"}
          </span>
        )}
      </span>
      <span className="smallcaps text-[10px] text-gold-leaf">Open lobby →</span>
    </Link>
  );
}

// If this device has a game in progress (tab closed mid-game, wandered home),
// offer the way back in. The record is written when an online game starts and
// cleared when it ends.
function ReturnToGameBanner() {
  const [active, setActive] = useState<ActiveGame | null>(null);
  useEffect(() => setActive(loadActiveGame()), []);
  if (!active) return null;
  return (
    <Link
      href={`/game/${active.id}`}
      className="plate mt-4 flex items-center justify-between gap-3 border border-gold/40 bg-gold/10 p-3 px-4 no-underline transition-colors hover:border-gold/70"
    >
      <span className="flex items-center gap-2 text-sm text-parchment-100">
        <span className="w-2 h-2 bg-gold-leaf animate-flicker" />
        You have a game in progress.
      </span>
      <span className="smallcaps text-[10px] text-gold-leaf">Rejoin →</span>
    </Link>
  );
}

// A signed-in player sees their two mode ratings next to the size of the card
// library (buff and nerf counts come straight from the engine constants).
// Signed out, a single-line invite takes the strip's place.
function StatStrip() {
  const [user, setUser] = useState<AccountUser | null | undefined>(undefined);
  const [modeRatings, setModeRatings] = useState<Partial<Record<"nerf" | "buff", number>>>({});

  useEffect(() => {
    let cancelled = false;
    fetchMe().then((me) => {
      if (cancelled) return;
      setUser(me);
      if (!me) return;
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
  const stats = [
    { value: String(modeRatings.nerf ?? fallback), label: "Nerf rating", tone: "text-mode-nerfGlow", tick: "bg-mode-nerf/70" },
    { value: String(modeRatings.buff ?? fallback), label: "Buff rating", tone: "text-mode-buffGlow", tick: "bg-mode-buff/70" },
    { value: ALL_BUFFS.length.toLocaleString(), label: "buffs in the deck", tone: "text-parchment-50", tick: "bg-sun/70" },
    { value: ALL_NERFS.length.toLocaleString(), label: "nerfs in the deck", tone: "text-parchment-50", tick: "bg-mint/70" },
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
            <div key={s.label} className="px-2 sm:px-6 text-center">
              <div className={`font-display text-3xl sm:text-4xl font-bold tabular-nums ${s.tone}`}>
                {s.value}
              </div>
              <span aria-hidden className={`mx-auto mt-2.5 block h-1 w-8 ${s.tick}`} />
              <div className="mt-2 smallcaps text-[9px] sm:text-[10px] text-parchment-400">
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
    <section className="section-rhythm w-full max-w-7xl mx-auto px-5 sm:px-6">
      <header className="mb-7 flex items-center gap-3">
        <span aria-hidden className="h-6 w-1.5 shrink-0 bg-mint" />
        <h2 className="display-3 text-parchment-50">How it works</h2>
        <span className="coord-index">c3</span>
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
                  Identical structure and spacing across all three so the
                  1 / 2 / 3 line reads as a single rule across the grid. */}
              <div className="flex items-center gap-3">
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
