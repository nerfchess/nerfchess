"use client";

import { NerfCard } from "@/components/NerfCard";
import { ALL_NERFS } from "@/engine/nerfs/library";
import Link from "next/link";
import { useMemo, useState } from "react";

const TIER_LABEL = ["", "Trivial", "Easy", "Common", "Severe", "Brutal"];
const TIER_ROMAN = ["", "I", "II", "III", "IV", "V"];

export default function CodexPage() {
  const [q, setQ] = useState("");
  const [tier, setTier] = useState<number | null>(null);
  const [onlyPlayable, setOnlyPlayable] = useState(false);

  const filtered = useMemo(() => {
    return ALL_NERFS.filter((d) => {
      if (tier && d.tier !== tier) return false;
      if (onlyPlayable && !d.implemented) return false;
      if (q && !(`${d.name} ${d.description}`.toLowerCase().includes(q.toLowerCase()))) return false;
      return true;
    });
  }, [q, tier, onlyPlayable]);

  const implementedCount = ALL_NERFS.filter((d) => d.implemented).length;

  return (
    <main className="min-h-screen pb-20">
      <nav className="flex items-center justify-between px-10 py-7">
        <Link href="/" className="font-display text-2xl tracking-tight">
          nerf<span className="text-gold-leaf">chess</span>
        </Link>
        <Link href="/play" className="px-3 py-1.5 rounded-full text-sm font-display hover:bg-white/5 text-parchment">Play</Link>
      </nav>

      <section className="max-w-6xl mx-auto px-6 pt-4">
        <div className="smallcaps text-[11px] text-parchment-400">the rules</div>
        <h1 className="font-display text-5xl sm:text-6xl mt-1">All the rules</h1>
        <p className="mt-3 text-parchment-200">
          {ALL_NERFS.length} secret rules in the library. {implementedCount} are playable today.
        </p>
        <div className="mt-4">
          <Link
            href="/codex/build"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full btn-ghost font-display text-sm"
          >
            <span aria-hidden="true">✦</span> Build your own rule
          </Link>
        </div>

        <div className="mt-7 plate p-4 sm:p-5 flex flex-wrap items-center gap-2">
          <label className="relative w-full sm:w-64">
            <span className="sr-only">Search the rules</span>
            <svg
              width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-parchment-400"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search the rules…"
              className="bg-ink-900/60 border border-white/15 rounded-full pl-9 pr-4 py-2 text-sm font-body w-full focus:outline-none focus:border-gold/60 text-parchment placeholder:text-parchment-400/60"
            />
          </label>
          <div className="flex gap-1 flex-wrap" role="group" aria-label="Filter by difficulty">
            <FilterPill onClick={() => setTier(null)} active={tier === null}>
              All
            </FilterPill>
            {[1, 2, 3, 4, 5].map((t) => (
              <FilterPill
                key={t}
                onClick={() => setTier(t)}
                active={tier === t}
                tone={`tier-${t}`}
              >
                <span className="mr-1 opacity-80">{TIER_ROMAN[t]}</span>
                {TIER_LABEL[t]}
              </FilterPill>
            ))}
          </div>
          <button
            onClick={() => setOnlyPlayable((p) => !p)}
            aria-pressed={onlyPlayable}
            className={
              "px-3 py-1.5 rounded-full border text-xs font-display transition inline-flex items-center gap-1.5 " +
              (onlyPlayable ? "bg-verdigris/20 border-verdigris text-verdigris-glow" : "border-white/15 text-parchment-300 hover:border-white/30")
            }
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Playable today
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="smallcaps text-[10px] text-parchment-400" role="status" aria-live="polite">
            Showing {filtered.length} of {ALL_NERFS.length} rules
          </p>
          {(q || tier !== null || onlyPlayable) && (
            <button
              onClick={() => { setQ(""); setTier(null); setOnlyPlayable(false); }}
              className="smallcaps text-[10px] text-parchment-400 hover:text-parchment-100 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((d) => (
            <NerfCard key={d.id} nerf={d} ownerLabel={`${TIER_ROMAN[d.tier]} · ${TIER_LABEL[d.tier]}`} />
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="mt-6 plate p-10 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center border border-white/15 text-parchment-400">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <p className="font-display text-lg text-parchment-100">No rules match your search</p>
            <p className="mt-1 text-sm text-parchment-400">
              Try a different word, or widen the difficulty filter.
            </p>
            <button
              onClick={() => { setQ(""); setTier(null); setOnlyPlayable(false); }}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full btn-ghost font-display text-sm"
            >
              Clear filters
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function FilterPill({
  active,
  onClick,
  children,
  tone,
}: { active: boolean; onClick: () => void; children: React.ReactNode; tone?: string }) {
  return (
    <button
      onClick={onClick}
      className={
        "px-3 py-1.5 rounded-full border text-xs font-display transition " +
        (active
          ? `bg-gold/15 border-gold text-gold-leaf ${tone ?? ""}`
          : `border-white/15 text-parchment-300 hover:border-white/30 ${tone ?? ""}`)
      }
    >
      {children}
    </button>
  );
}
