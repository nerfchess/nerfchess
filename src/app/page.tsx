"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HeroTv } from "@/components/HeroTv";
import { SiteHeader } from "@/components/SiteHeader";
import { ALL_NERFS, PLAYABLE_NERFS } from "@/engine/nerfs/library";
import { ALL_BUFFS } from "@/engine/buffs/library";
import type { Nerf } from "@/engine/nerf";
import type { Buff } from "@/engine/buff";
import { useLobbySnapshot } from "@/lib/lobbyClient";
import { AccountUser, fetchMe } from "@/lib/authClient";
import { ActiveGame, loadActiveGame } from "@/lib/multiplayer";
import { TIER_LABEL, TIER_ROMAN } from "@/lib/tiers";

// Real library count, computed once, for the "See all N" codex link. The full
// library is every nerf plus every buff, hex, boon, and item card.
const TOTAL_RULES = ALL_NERFS.length + ALL_BUFFS.length;

// A hand-picked spread of cards, three from each mode and across a range of
// tiers, so a first visitor sees what a card can be: from a mild secret rule
// to a flashy power-up. Each one deep-links into the codex, searched to that
// card by name.
const EXAMPLE_NERF_IDS = ["shadow_queen", "get_down_mr_president", "abstinence"];
const EXAMPLE_BUFF_IDS = ["time_skip", "god_knight", "mass_freeze"];

type ExampleCard = {
  id: string;
  name: string;
  description: string;
  tier: number;
  kind: "nerf" | "buff";
};

function exampleCards(): ExampleCard[] {
  const nerfById = new Map(ALL_NERFS.map((n) => [n.id, n]));
  const buffById = new Map(ALL_BUFFS.map((b) => [b.id, b]));

  const nerfs = EXAMPLE_NERF_IDS.map((id) => nerfById.get(id)).filter(
    (n): n is Nerf => !!n
  );
  const buffs = EXAMPLE_BUFF_IDS.map((id) => buffById.get(id)).filter(
    (b): b is Buff => !!b
  );

  // Fall back to library order if an id ever drifts, so the section never
  // renders short of its three-and-three.
  const nerfPicks = nerfs.length >= 3 ? nerfs : PLAYABLE_NERFS.slice(0, 3);
  const buffPicks = buffs.length >= 3 ? buffs : ALL_BUFFS.slice(0, 3);

  return [
    ...nerfPicks.slice(0, 3).map(
      (n): ExampleCard => ({
        id: n.id,
        name: n.name,
        description: n.description,
        tier: n.tier,
        kind: "nerf",
      })
    ),
    ...buffPicks.slice(0, 3).map(
      (b): ExampleCard => ({
        id: b.id,
        name: b.name,
        description: b.description,
        tier: b.tier,
        kind: "buff",
      })
    ),
  ];
}

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />

      <section className="mode-field w-full max-w-7xl mx-auto px-5 sm:px-6 pt-2 pb-10 sm:pt-6 grid lg:grid-cols-[minmax(0,1fr)_380px] gap-8 lg:gap-14 items-center">
        <div className="order-1">
          <HeroTv />
        </div>

        {/* The action column is kept short on purpose: it should never run
            taller than the board beside it. */}
        <div className="order-2">
          <span className="eyebrow">Nerf Chess</span>
          <p className="lead mt-4 text-parchment-100">
            In{" "}
            <Link
              href="/lobby?mode=nerf"
              className="font-semibold text-mode-nerfGlow underline decoration-mode-nerf/50 underline-offset-4 transition-colors hover:decoration-mode-nerfGlow"
            >
              Nerf
            </Link>{" "}
            mode you carry a secret handicap. In{" "}
            <Link
              href="/lobby?mode=buff"
              className="font-semibold text-mode-buffGlow underline decoration-mode-buff/50 underline-offset-4 transition-colors hover:decoration-mode-buffGlow"
            >
              Buff
            </Link>{" "}
            mode you draft power-ups. Capture the king to win.
          </p>

          <ReturnToGameBanner />

          {/* Action hierarchy: playing a real person is THE flow. One big
              primary into the lobby, two quieter options below it, all on a
              flat bordered panel so the column reads as one control cluster. */}
          <div className="mt-5 flex flex-col gap-3 border border-white/10 bg-white/[0.04] p-4">
            <Link
              href="/lobby"
              className="btn-leaf btn-cta w-full flex items-center justify-center gap-3 px-8 py-5 font-display text-xl sm:text-2xl font-semibold motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out motion-safe:hover:-translate-y-px motion-safe:active:scale-[0.98]"
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
                href="/friend"
                className="btn-glass flex items-center justify-center gap-2 px-4 py-3 font-display text-base font-medium motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out motion-safe:hover:-translate-y-px motion-safe:active:scale-[0.98]"
              >
                Play a Friend
              </Link>
              <Link
                href="/game?mode=ai"
                className="btn-glass flex items-center justify-center gap-2 px-4 py-3 font-display text-base font-medium motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out motion-safe:hover:-translate-y-px motion-safe:active:scale-[0.98]"
              >
                Play vs Bot
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
      <SeamDivider />
      <ExampleRules />

      <SiteFooter />
    </main>
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

function ExampleRules() {
  const cards = exampleCards();
  return (
    <section className="section-rhythm w-full max-w-7xl mx-auto px-5 sm:px-6">
      <div className="flex items-end justify-between gap-4 mb-7">
        <header className="flex items-center gap-3">
          <span aria-hidden className="h-6 w-1.5 shrink-0 bg-coral" />
          <h2 className="display-3 text-parchment-50">A few of the cards</h2>
          <span className="coord-index">e5</span>
        </header>
        <Link
          href="/codex"
          className="shrink-0 smallcaps text-[10px] text-parchment-400 hover:text-parchment-100 transition-colors"
        >
          See all {TOTAL_RULES}
        </Link>
      </div>
      <ul className="stagger-in grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const isNerf = card.kind === "nerf";
          return (
            <li key={`${card.kind}-${card.id}`}>
              <Link
                href={`/codex?search=${encodeURIComponent(card.name)}`}
                className={`plate card-juicy group flex h-full flex-col border p-4 no-underline tier-bg-${card.tier}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={`font-display text-lg font-semibold leading-tight tier-${card.tier}`}>
                    {card.name}
                  </span>
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center border font-display text-xs font-bold tier-bg-${card.tier} tier-${card.tier}`}
                    title={`Difficulty ${card.tier}: ${TIER_LABEL[card.tier]}`}
                  >
                    {TIER_ROMAN[card.tier]}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-parchment-200 line-clamp-1">
                  {card.description}
                </p>
                <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                  <span
                    className={`inline-flex items-center border px-2 py-0.5 smallcaps text-[9px] ${
                      isNerf
                        ? "border-mode-nerf/40 bg-mode-nerf/10 text-mode-nerfGlow"
                        : "border-mode-buff/40 bg-mode-buff/10 text-mode-buffGlow"
                    }`}
                  >
                    {isNerf ? "Nerf · secret rule" : "Buff · power-up"}
                  </span>
                  <span className="flex items-center gap-1 smallcaps text-[10px] text-parchment-400 transition-colors group-hover:text-gold-leaf">
                    Codex
                    <span
                      aria-hidden
                      className="transition-transform motion-safe:group-hover:translate-x-0.5"
                    >
                      →
                    </span>
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
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
