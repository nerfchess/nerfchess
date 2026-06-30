"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { NerfOrbit } from "@/components/NerfOrbit";
import { SettingsPanel } from "@/components/SettingsPanel";
import { loadRating } from "@/lib/rating";

export default function HomePage() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <main className="min-h-screen">
      <SiteNav onOpenSettings={() => setSettingsOpen(true)} />

      <section className="max-w-6xl mx-auto px-6 pt-6 pb-12 sm:pt-12 sm:pb-20 grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-6 items-center">
        <div className="animate-rise order-2 lg:order-1 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/30 bg-gold/5">
            <span className="w-1.5 h-1.5 rounded-full bg-lichess-green animate-flicker" />
            <span className="smallcaps text-[10px] text-gold-leaf">Free · open · no sign-up</span>
          </div>

          <h1 className="mt-6 font-display font-extrabold text-5xl sm:text-6xl lg:text-7xl leading-[0.98] tracking-tight">
            <span className="block text-parchment">Chess, with a</span>
            <span className="block text-gold-leaf">secret catch.</span>
          </h1>

          <p className="mt-5 max-w-xl mx-auto lg:mx-0 text-lg leading-relaxed text-parchment-200">
            Every game you&apos;re handed one of 150+ hidden rules that bends how your
            pieces move. Forget checkmate &mdash; just capture the king before they
            figure you out.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-3">
            <Link href="/play" className="px-8 py-3.5 rounded-md btn-lichess text-base">
              Play now
            </Link>
            <Link href="/tutorial" className="px-6 py-3.5 rounded-md btn-ghost font-body font-medium">
              How to play
            </Link>
            <Link href="/codex" className="px-6 py-3.5 rounded-md btn-ghost font-body font-medium">
              Browse the rules
            </Link>
          </div>

          <ul className="mt-9 grid grid-cols-3 max-w-md mx-auto lg:mx-0 gap-3 text-sm border-t border-parchment/10 pt-6">
            <Stat value="150+" label="hidden rules" />
            <Stat value="∞" label="ways to lose" />
            <Stat value="0" label="checkmates" />
          </ul>
        </div>

        <div className="order-1 lg:order-2 flex justify-center -my-6 sm:my-0">
          <NerfOrbit />
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16 sm:py-20">
        <div className="rule-ornament mb-10">
          <span>How it plays</span>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              n: "01",
              t: "Hidden information",
              d: "You see your rule. Your opponent sees theirs. Read the board, read the bluff.",
            },
            {
              n: "02",
              t: "No checkmate",
              d: "The king is just another piece. Capture it. Castle through check if you dare.",
            },
            {
              n: "03",
              t: "150+ rules",
              d: "From “you can’t touch the h-file” to “if a pawn reaches your half, you lose.”",
            },
          ].map((f) => (
            <article
              key={f.t}
              className="plate p-6 rounded-lg transition-colors hover:border-gold/30"
            >
              <div className="font-mono text-gold-leaf text-sm tracking-widest">{f.n}</div>
              <div className="mt-4 font-display font-bold text-xl text-parchment leading-tight">
                {f.t}
              </div>
              <p className="mt-2 text-[14px] leading-relaxed text-parchment-200/90">{f.d}</p>
            </article>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Link
            href="/play"
            className="px-9 py-4 rounded-md btn-lichess text-lg inline-flex items-center gap-2"
          >
            Start a game
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      </section>

      <SiteFooter />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <li className="text-center lg:text-left">
      <div className="font-display font-extrabold text-2xl text-parchment leading-none">{value}</div>
      <div className="smallcaps text-[9px] text-parchment-400 mt-1.5">{label}</div>
    </li>
  );
}

function SiteNav({ onOpenSettings }: { onOpenSettings: () => void }) {
  const [rating, setRating] = useState<number | null>(null);
  useEffect(() => {
    const r = loadRating();
    if (r.games > 0) setRating(Math.round(r.rating));
  }, []);

  return (
    <nav className="flex items-center justify-between px-5 sm:px-10 py-5 sm:py-6">
      <Logo />
      <div className="flex items-center gap-1 sm:gap-2 text-sm font-body font-medium">
        {rating != null && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 mr-1 rounded-full border border-gold/25 bg-gold/5">
            <span className="smallcaps text-[9px] text-parchment-400">Rating</span>
            <span className="font-mono text-sm text-gold-leaf tabular-nums">{rating}</span>
          </div>
        )}
        <Link href="/play" className="px-3 py-1.5 rounded-full hover:bg-white/5 text-parchment">Play</Link>
        <Link href="/codex" className="px-3 py-1.5 rounded-full hover:bg-white/5 text-parchment">Rules</Link>
        <Link href="/tutorial" className="hidden sm:inline-block px-3 py-1.5 rounded-full hover:bg-white/5 text-parchment">How to play</Link>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Settings"
          title="Settings"
          className="ml-1 w-9 h-9 inline-flex items-center justify-center rounded-full btn-ghost"
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
    <footer className="max-w-6xl mx-auto px-6 py-10">
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
        <span>Nerf Chess &mdash; chess with secret rules.</span>
        <span className="font-mono text-[10px] opacity-70">made with &hearts;</span>
      </div>
    </footer>
  );
}
