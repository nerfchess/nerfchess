"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { NerfOrbit } from "@/components/NerfOrbit";
import { SettingsPanel } from "@/components/SettingsPanel";

export default function HomePage() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <main className="min-h-screen">
      <SiteNav onOpenSettings={() => setSettingsOpen(true)} />

      <section className="max-w-6xl mx-auto px-6 pt-10 pb-16 sm:pt-16 sm:pb-24 grid lg:grid-cols-[1.1fr_1fr] gap-14 items-center">
        <div className="animate-rise order-2 lg:order-1">
          <h1 className="font-display font-normal text-5xl sm:text-7xl leading-[1.02] tracking-[-0.02em]">
            <span className="block text-parchment-100">Nerf Chess:</span>
            <span className="block italic text-gold-leaf">capture the king</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-parchment-200">
            A chess-first game with hidden rules. Every game, you and your opponent get a secret constraint that changes how you can move.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/play" className="px-7 py-3 btn-leaf font-body text-base">
              Play now
            </Link>
            <Link href="/tutorial" className="px-7 py-3 btn-ghost font-body">
              Learn the basics
            </Link>
            <Link href="/codex" className="px-7 py-3 btn-ghost font-body">
              Browse the rules
            </Link>
          </div>

          <ul className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm text-parchment-200/90 border-t border-parchment/10 pt-5">
            <li className="flex items-baseline gap-2">
              <span className="font-display italic text-gold-leaf text-xs">i.</span> No checkmate
            </li>
            <li className="flex items-baseline gap-2">
              <span className="font-display italic text-gold-leaf text-xs">ii.</span> Capture the king
            </li>
            <li className="flex items-baseline gap-2">
              <span className="font-display italic text-gold-leaf text-xs">iii.</span> Secret nerfs
            </li>
          </ul>
        </div>

        <div className="order-1 lg:order-2 flex justify-center">
          <NerfOrbit />
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="rule-ornament mb-12">
          <span>Three things to know</span>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              n: "I",
              t: "Hidden information",
              d: "You see your rule. They see theirs. A misread is punished. A bluff is rewarded.",
            },
            {
              n: "II",
              t: "Modified rules",
              d: "Forget checkmate. The king is just another piece you can capture. Castling through check is allowed.",
            },
            {
              n: "III",
              t: "150+ rules",
              d: "From “you can't move to the h-file” to “if any enemy pawn touches your half, you lose.”",
            },
          ].map((f) => (
            <article key={f.t} className="plate p-7 relative overflow-hidden">
              <div className="font-display italic text-gold-leaf text-4xl leading-none tracking-tight">{f.n}</div>
              <div className="mt-5 font-display text-2xl text-parchment-100 leading-tight">{f.t}</div>
              <p className="mt-3 text-[14px] leading-relaxed text-parchment-200/90">{f.d}</p>
            </article>
          ))}
        </div>
      </section>

      <SiteFooter />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}

function SiteNav({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <nav className="flex items-center justify-between px-5 sm:px-10 py-6 sm:py-7">
      <Logo />
      <div className="flex items-center gap-1 sm:gap-2 text-sm font-body font-medium">
        <Link href="/play" className="px-3 py-1.5 hover:bg-white/5 text-parchment-100">Play</Link>
        <Link href="/leaderboard" className="px-3 py-1.5 hover:bg-white/5 text-parchment-100">Leaderboard</Link>
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
