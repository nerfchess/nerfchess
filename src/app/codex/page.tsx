"use client";

import { MobileNavMenu } from "@/components/MobileNavMenu";
import { NerfCard } from "@/components/NerfCard";
import { ALL_NERFS } from "@/engine/nerfs/library";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORY_DEFS } from "@/lib/nerfCategories";
import {
  EMPTY_FILTERS,
  SORT_OPTIONS,
  filterAndSortNerfs,
  filtersFromQueryString,
  filtersToQueryString,
  hasActiveFilters,
  type CodexFilters,
} from "@/lib/nerfFilter";

import { TIER_LABEL, TIER_ROMAN } from "@/lib/tiers";

export default function CodexPage() {
  const [filters, setFilters] = useState<CodexFilters>(EMPTY_FILTERS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hydrated = useRef(false);

  // Initialise from the URL on mount so links / refreshes restore filters.
  useEffect(() => {
    setFilters(filtersFromQueryString(window.location.search));
    hydrated.current = true;
  }, []);

  // Mirror filters back into the URL (replace, so history isn't spammed).
  useEffect(() => {
    if (!hydrated.current) return;
    const qs = filtersToQueryString(filters);
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [filters]);

  const filtered = useMemo(() => filterAndSortNerfs(ALL_NERFS, filters), [filters]);

  const patch = (p: Partial<CodexFilters>) => setFilters((f) => ({ ...f, ...p }));
  const toggleCategory = (id: string) =>
    setFilters((f) => ({
      ...f,
      categories: f.categories.includes(id)
        ? f.categories.filter((c) => c !== id)
        : [...f.categories, id],
    }));
  const clearAll = () => setFilters({ ...EMPTY_FILTERS });

  const active = hasActiveFilters(filters);
  const activeCount =
    filters.categories.length + (filters.tier !== null ? 1 : 0) + (filters.playableOnly ? 1 : 0);

  return (
    <main className="min-h-screen pb-20">
      <nav className="flex items-center justify-between px-6 sm:px-10 py-6 sm:py-7">
        <Link href="/" className="font-display text-2xl tracking-tight">
          nerf<span className="text-gold-leaf">chess</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/play" className="hidden sm:inline-block px-3 py-1.5 rounded-full text-sm font-display hover:bg-white/5 text-parchment">Play</Link>
          <MobileNavMenu />
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-6 pt-4">
        <div className="smallcaps text-[11px] text-parchment-400">the rules</div>
        <h1 className="font-display text-5xl sm:text-6xl mt-1">All the rules</h1>
        <p className="mt-3 text-parchment-200">
          {ALL_NERFS.length} secret rules in the library. Search by name, effect, or category.
        </p>
        <div className="mt-4">
          <Link
            href="/codex/suggest"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full btn-ghost font-display text-sm"
          >
            <span aria-hidden="true">✦</span> Suggest a rule
          </Link>
        </div>

        {/* Sticky search + a mobile "Filters" disclosure. */}
        <div className="sticky top-0 z-20 -mx-6 mt-6 px-6 py-3 bg-ink-950/85 backdrop-blur-md border-b border-white/5">
          <div className="flex items-center gap-2">
            <label className="relative flex-1">
              <span className="sr-only">Search the rules</span>
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-parchment-400" />
              <input
                value={filters.search}
                onChange={(e) => patch({ search: e.target.value })}
                placeholder="Search the rules…"
                className="w-full bg-ink-900/70 border border-white/15 rounded-full pl-9 pr-9 py-2.5 text-sm font-body focus:outline-none focus:border-gold/60 text-parchment placeholder:text-parchment-400/60 transition-colors"
              />
              {filters.search && (
                <button
                  onClick={() => patch({ search: "" })}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-parchment-400 hover:text-parchment"
                >
                  ×
                </button>
              )}
            </label>
            <button
              onClick={() => setDrawerOpen((o) => !o)}
              aria-expanded={drawerOpen}
              className="sm:hidden inline-flex items-center gap-1.5 shrink-0 px-3 py-2.5 rounded-full border border-white/15 text-sm text-parchment-200 hover:border-white/30"
            >
              <FilterIcon />
              Filters
              {activeCount > 0 && (
                <span className="grid place-items-center min-w-[18px] h-[18px] px-1 rounded-full bg-gold/25 text-gold-leaf text-[10px] font-mono">
                  {activeCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filter panel: always visible on sm+, collapsible on mobile. */}
        <div className={(drawerOpen ? "block" : "hidden") + " sm:block mt-4 space-y-4"}>
          <FilterRow label="Difficulty">
            <FilterPill onClick={() => patch({ tier: null })} active={filters.tier === null}>
              All
            </FilterPill>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((t) => (
              <FilterPill
                key={t}
                onClick={() => patch({ tier: filters.tier === t ? null : t })}
                active={filters.tier === t}
                tone={`tier-${t}`}
              >
                <span className="mr-1 opacity-80">{TIER_ROMAN[t]}</span>
                {TIER_LABEL[t]}
              </FilterPill>
            ))}
          </FilterRow>

          <FilterRow label="Category">
            {CATEGORY_DEFS.map((c) => (
              <FilterPill
                key={c.id}
                onClick={() => toggleCategory(c.id)}
                active={filters.categories.includes(c.id)}
              >
                {c.label}
              </FilterPill>
            ))}
          </FilterRow>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <label className="flex items-center gap-2">
              <span className="smallcaps text-[11px] text-parchment-400">Sort</span>
              <select
                value={filters.sort}
                onChange={(e) => patch({ sort: e.target.value as CodexFilters["sort"] })}
                className="bg-ink-900/70 border border-white/15 rounded-full px-3 py-1.5 text-xs font-body text-parchment focus:outline-none focus:border-gold/60 cursor-pointer"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id} className="bg-ink-900 text-parchment">
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              onClick={() => patch({ playableOnly: !filters.playableOnly })}
              aria-pressed={filters.playableOnly}
              className={
                "px-3 py-1.5 rounded-full border text-xs font-display transition inline-flex items-center gap-1.5 " +
                (filters.playableOnly
                  ? "bg-verdigris/20 border-verdigris text-verdigris-glow"
                  : "border-white/15 text-parchment-300 hover:border-white/30")
              }
            >
              <CheckIcon />
              Playable
            </button>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="smallcaps text-[10px] text-parchment-400" role="status" aria-live="polite">
            Showing {filtered.length} of {ALL_NERFS.length} rules
          </p>
          {active && (
            <button
              onClick={clearAll}
              className="smallcaps text-[10px] text-parchment-400 hover:text-parchment-100 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        {filtered.length > 0 ? (
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((d) => (
              <NerfCard key={d.id} nerf={d} ownerLabel={`${TIER_ROMAN[d.tier]} · ${TIER_LABEL[d.tier]}`} />
            ))}
          </div>
        ) : (
          <div className="mt-6 plate p-10 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full border border-white/15 text-parchment-400">
              <SearchIcon />
            </div>
            <p className="font-display text-lg text-parchment-100">No rules match your filters.</p>
            <p className="mt-1 text-sm text-parchment-400">
              Try a different word, or widen the difficulty and category filters.
            </p>
            <button
              onClick={clearAll}
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

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
      <span className="smallcaps text-[11px] text-parchment-400 shrink-0 sm:w-16 sm:pt-1.5">{label}</span>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Filter by ${label.toLowerCase()}`}>
        {children}
      </div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={
        "px-3 py-1.5 rounded-full border text-xs font-display transition-colors duration-150 " +
        (active
          ? `bg-gold/15 border-gold text-gold-leaf ${tone ?? ""}`
          : `border-white/12 text-parchment-300 hover:border-white/30 hover:bg-white/[0.03] ${tone ?? ""}`)
      }
    >
      {children}
    </button>
  );
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
