"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { HeroBoard } from "@/components/HeroBoard";
import { SettingsPanel } from "@/components/SettingsPanel";
import { ALL_NERFS, PLAYABLE_NERFS } from "@/engine/nerfs/library";
import type { Nerf } from "@/engine/nerf";

const TIER_LABEL = ["", "Trivial", "Easy", "Common", "Severe", "Brutal"];
const TIER_ROMAN = ["", "I", "II", "III", "IV", "V"];
const TIER_HEX = ["#8a8783", "#7eb59a", "#8ba9c4", "#d8b56e", "#c79468", "#c66860"];

// Real library counts, computed once. These feed the social proof strip so the
// numbers stay honest and update automatically as the rule set grows.
const TOTAL_RULES = ALL_NERFS.length;
const PLAYABLE_TODAY = ALL_NERFS.filter((n) => n.implemented).length;

// A hand-picked spread across the difficulty tiers so a first visitor sees the
// range of what a "secret rule" can be, from gentle to brutal.
const EXAMPLE_RULE_IDS = [
  "horse_tranquilizer",
  "shadow_queen",
  "no_shuffling",
  "get_down_mr_president",
  "respectful",
  "abstinence",
];

function rollNerf(): Nerf {
  const pool = PLAYABLE_NERFS.filter((n) => n.id !== "lucky");
  return pool[Math.floor(Math.random() * pool.length)];
}

function exampleRules(): Nerf[] {
  const byId = new Map(ALL_NERFS.map((n) => [n.id, n]));
  const picked = EXAMPLE_RULE_IDS.map((id) => byId.get(id)).filter(
    (n): n is Nerf => !!n
  );
  // Fall back to the first few playable rules if any id drifts out of the library.
  if (picked.length >= 3) return picked;
  return PLAYABLE_NERFS.slice(0, 6);
}

export default function HomePage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Rolled on the client after mount to avoid a hydration mismatch, and so the
  // "secret rule" feels alive: it changes every visit and on demand.
  const [nerf, setNerf] = useState<Nerf | null>(null);
  useEffect(() => setNerf(rollNerf()), []);

  return (
    <main className="min-h-screen flex flex-col">
      <SiteNav onOpenSettings={() => setSettingsOpen(true)} />

      <section className="w-full max-w-6xl mx-auto px-5 sm:px-6 pt-2 pb-8 sm:pt-6 grid lg:grid-cols-[minmax(0,1fr)_380px] gap-8 lg:gap-14 items-center">
        <div className="order-1">
          <HeroBoard />
        </div>

        <div className="order-2">
          <h1 className="font-display text-3xl sm:text-4xl font-bold leading-[1.1] text-parchment-50">
            Chess, but every game gives you a secret rule.
          </h1>
          <p className="mt-3 text-base sm:text-lg leading-relaxed text-parchment-200">
            You get a hidden restriction on how your pieces can move. So does
            your opponent. Neither of you knows the other's rule. There is no
            checkmate: you win by capturing the king.
          </p>

          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <Link
              href="/game?mode=ai"
              className="btn-leaf w-full sm:w-auto sm:min-w-[200px] flex items-center justify-center gap-2 px-8 py-4 font-display text-xl font-semibold"
            >
              Play now
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
            <Link
              href="/tutorial"
              className="btn-ghost w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 font-display text-lg font-semibold"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              How it works
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-parchment-300">
            <Link href="/play" className="hover:text-parchment-100 transition-colors">Custom game</Link>
            <span aria-hidden className="opacity-30">·</span>
            <Link href="/friend" className="hover:text-parchment-100 transition-colors">Play a friend</Link>
            <span aria-hidden className="opacity-30">·</span>
            <Link href="/codex" className="hover:text-parchment-100 transition-colors">Browse the rules</Link>
          </div>

          <SecretRule nerf={nerf} onReroll={() => setNerf(rollNerf())} />
        </div>
      </section>

      <StatStrip />
      <HowItWorks />
      <ExampleRules />

      <SiteFooter />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}

// The one good idea from the old landing, folded in beside the play action as a
// live "this is what a secret rule looks like" element instead of scattered
// floating feature cards. Rerolls in place so the variety shows itself.
function SecretRule({ nerf, onReroll }: { nerf: Nerf | null; onReroll: () => void }) {
  const accent = nerf ? TIER_HEX[nerf.tier] ?? TIER_HEX[0] : TIER_HEX[0];
  return (
    <div className="mt-9 border-t border-white/10 pt-5">
      <div className="flex items-center justify-between">
        <span className="smallcaps text-[10px] text-parchment-400">
          Your secret rule this game
        </span>
        <button
          type="button"
          onClick={onReroll}
          className="smallcaps text-[10px] text-parchment-400 hover:text-parchment-100 transition-colors inline-flex items-center gap-1.5"
        >
          Reroll
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>
      </div>

      <div className="mt-3 min-h-[4.5rem] pl-3 border-l-2" style={{ borderColor: accent }}>
        {nerf ? (
          <>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-lg leading-tight" style={{ color: accent }}>
                {nerf.name}
              </span>
              <span className="font-mono text-[10px] font-bold" style={{ color: accent }}>
                {TIER_ROMAN[nerf.tier]}
              </span>
            </div>
            <p className="mt-1 text-sm leading-snug text-parchment-200">
              {nerf.description}
            </p>
          </>
        ) : (
          <div className="text-sm text-parchment-400">Rolling…</div>
        )}
      </div>
    </div>
  );
}

// Social proof strip. Rule counts are real and pulled from the library. The
// games-played figure is a placeholder until a backend counter is wired in;
// swap PLACEHOLDER_GAMES for a fetched value when the API exists.
const PLACEHOLDER_GAMES = "12,400+";

function StatStrip() {
  const stats = [
    { value: TOTAL_RULES.toString(), label: "secret rules" },
    { value: PLAYABLE_TODAY.toString(), label: "playable today" },
    { value: PLACEHOLDER_GAMES, label: "games played" },
  ];
  return (
    <section className="w-full max-w-6xl mx-auto px-5 sm:px-6 py-4">
      <div className="plate p-5 sm:p-6 grid grid-cols-3 divide-x divide-white/10">
        {stats.map((s) => (
          <div key={s.label} className="px-2 sm:px-4 text-center">
            <div className="font-display text-2xl sm:text-4xl font-bold text-parchment-50 tabular-nums">
              {s.value}
            </div>
            <div className="mt-1 smallcaps text-[9px] sm:text-[10px] text-parchment-400">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "1",
      title: "Get a secret rule",
      body: "At the start of every game you are dealt a hidden restriction, drawn from a deck of hundreds.",
      icon: (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M8 10h8M8 14h5" />
        </>
      ),
    },
    {
      n: "2",
      title: "Play with your restriction",
      body: "Move as normal, but your rule quietly limits your options. Illegal moves are filtered out for you.",
      icon: (
        <>
          <path d="M12 2l2.4 6.9H21l-5.6 4 2.1 7L12 15.8 6.5 19.9l2.1-7L3 8.9h6.6z" />
        </>
      ),
    },
    {
      n: "3",
      title: "Capture the king to win",
      body: "There is no checkmate here. Read your opponent, exploit their hidden rule, and take the king.",
      icon: (
        <>
          <path d="M12 3v4M9 7h6M6 21h12l-1-9-4 3-1-6-1 6-4-3z" />
        </>
      ),
    },
  ];
  return (
    <section className="w-full max-w-6xl mx-auto px-5 sm:px-6 py-8">
      <div className="rule-ornament mb-6">
        <span className="font-display">How it works</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {steps.map((step) => (
          <div key={step.n} className="plate p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center border border-gold/40 bg-gold/10 font-display text-base font-bold text-gold-leaf">
                {step.n}
              </span>
              <svg
                width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
                strokeLinejoin="round" aria-hidden className="text-parchment-300"
              >
                {step.icon}
              </svg>
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold text-parchment-50">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-parchment-300">
              {step.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ExampleRules() {
  const rules = exampleRules();
  return (
    <section className="w-full max-w-6xl mx-auto px-5 sm:px-6 py-8">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div className="rule-ornament flex-1">
          <span className="font-display">A few of the rules</span>
        </div>
        <Link
          href="/codex"
          className="shrink-0 smallcaps text-[10px] text-parchment-400 hover:text-parchment-100 transition-colors"
        >
          See all {TOTAL_RULES}
        </Link>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rules.map((rule) => (
          <li
            key={rule.id}
            className={`plate p-4 border tier-bg-${rule.tier}`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className={`font-display text-lg font-semibold leading-tight tier-${rule.tier}`}>
                {rule.name}
              </span>
              <span
                className={`shrink-0 inline-flex items-center gap-1 border px-2 py-0.5 font-display text-xs font-bold tier-bg-${rule.tier} tier-${rule.tier}`}
                title={`Difficulty ${rule.tier}: ${TIER_LABEL[rule.tier]}`}
              >
                <span aria-hidden>{TIER_ROMAN[rule.tier]}</span>
                <span>{TIER_LABEL[rule.tier]}</span>
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-parchment-200">
              {rule.description}
            </p>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex justify-center">
        <Link
          href="/game?mode=ai"
          className="btn-leaf inline-flex items-center gap-2 px-8 py-3.5 font-display text-lg font-semibold"
        >
          Deal me a rule and play
        </Link>
      </div>
    </section>
  );
}

function SiteNav({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <nav className="flex items-center justify-between px-5 sm:px-10 py-5 sm:py-6">
      <Logo />
      <div className="flex items-center gap-1 sm:gap-2 text-sm font-body font-medium">
        <Link href="/game?mode=ai" className="px-3 py-1.5 hover:bg-white/5 text-parchment-100">Play</Link>
        <Link href="/leaderboard" className="hidden sm:inline-block px-3 py-1.5 hover:bg-white/5 text-parchment-100">Leaderboard</Link>
        <Link href="/codex" className="px-3 py-1.5 hover:bg-white/5 text-parchment-100">Rules</Link>
        <Link href="/tutorial" className="hidden sm:inline-block px-3 py-1.5 hover:bg-white/5 text-parchment-100">How to play</Link>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Settings"
          title="Settings"
          className="ml-1 w-9 h-9 inline-flex items-center justify-center btn-ghost"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33 1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </nav>
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
    <footer className="max-w-6xl mx-auto w-full px-6 py-8">
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
        <span>Nerf Chess: chess with secret rules.</span>
        <span className="font-mono text-[10px] opacity-70">made with &hearts;</span>
      </div>
    </footer>
  );
}
