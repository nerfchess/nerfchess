"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { HeroBoard } from "@/components/HeroBoard";
import { SettingsPanel } from "@/components/SettingsPanel";
import { PLAYABLE_NERFS } from "@/engine/nerfs/library";
import type { Nerf } from "@/engine/nerf";

const TIER_ROMAN = ["", "I", "II", "III", "IV", "V"];
const TIER_HEX = ["#8a8783", "#7eb59a", "#8ba9c4", "#d8b56e", "#c79468", "#c66860"];

function rollNerf(): Nerf {
  const pool = PLAYABLE_NERFS.filter((n) => n.id !== "lucky");
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function HomePage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Rolled on the client after mount to avoid a hydration mismatch, and so the
  // "secret rule" feels alive — it changes every visit and on demand.
  const [nerf, setNerf] = useState<Nerf | null>(null);
  useEffect(() => setNerf(rollNerf()), []);

  return (
    <main className="min-h-screen flex flex-col">
      <SiteNav onOpenSettings={() => setSettingsOpen(true)} />

      <section className="flex-1 w-full max-w-6xl mx-auto px-5 sm:px-6 pt-2 pb-12 sm:pt-6 grid lg:grid-cols-[minmax(0,1fr)_350px] gap-8 lg:gap-14 items-center">
        <div className="order-1">
          <HeroBoard />
        </div>

        <div className="order-2">
          <p className="text-lg sm:text-xl leading-relaxed text-parchment-100">
            Chess, but every game hands you a secret rule that limits how your
            pieces move.
          </p>
          <p className="mt-2 text-sm text-parchment-300">
            No checkmate — just capture the king.
          </p>

          <Link
            href="/game?mode=ai"
            className="btn-leaf mt-7 w-full sm:w-auto sm:min-w-[220px] flex items-center justify-center gap-2 px-8 py-4 font-display text-xl font-semibold"
          >
            Play
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-parchment-300">
            <Link href="/play" className="hover:text-parchment-100 transition-colors">Custom game</Link>
            <span aria-hidden className="opacity-30">·</span>
            <Link href="/friend" className="hover:text-parchment-100 transition-colors">Play a friend</Link>
            <span aria-hidden className="opacity-30">·</span>
            <Link href="/tutorial" className="hover:text-parchment-100 transition-colors">How it works</Link>
            <span aria-hidden className="opacity-30">·</span>
            <Link href="/codex" className="hover:text-parchment-100 transition-colors">Rules</Link>
          </div>

          <SecretRule nerf={nerf} onReroll={() => setNerf(rollNerf())} />
        </div>
      </section>

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
        <span>Nerf Chess &mdash; chess with secret rules.</span>
        <span className="font-mono text-[10px] opacity-70">made with &hearts;</span>
      </div>
    </footer>
  );
}
